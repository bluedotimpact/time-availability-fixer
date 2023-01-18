import {Button, FieldPickerSynced, initializeBlock, Label, Loader, TablePickerSynced, useBase, useGlobalConfig, ViewPickerSynced} from '@airtable/blocks/ui';
import React, { useState } from 'react';
import { correctTimeAv, parseTimezoneToOffsetInHours, adjustTimeAv } from '../lib/adjust';
import { GCKey, get } from './globalConfigHelpers';

function HelloWorldTypescriptApp() {
    const globalConfig = useGlobalConfig();
    const base = useBase()
    const participantsTable = base.getTableByIdIfExists(get(globalConfig, GCKey.TABLE_ID, base.tables[0].id))
    const [running, setRunning] = useState<boolean>(false)
    const [error, setError] = useState<string | undefined>(undefined)

    const onSubmit = async () => {
        setRunning(true)
        setError(undefined)
        try {
            await fix();
        } catch (err) {
            setError(String(err))
        }
        setRunning(false)
    }

    const fix = async () => {
        const tableId: string | null = get(globalConfig, GCKey.TABLE_ID, null)
        if (!tableId) throw new Error('No table selected')

        const viewId: string | null = get(globalConfig, GCKey.VIEW_ID, null)
        if (!viewId) throw new Error('No view selected')

        const inputAvailabilityFieldId: string | null = get(globalConfig, GCKey.INPUT_AVAILABILITY_FIELD_ID, null)
        if (!inputAvailabilityFieldId) throw new Error('No inputAvailabilityField selected')

        const inputTimezoneFieldId: string | null = get(globalConfig, GCKey.INPUT_TIMEZONE_FIELD_ID, null)
        if (!inputTimezoneFieldId) throw new Error('No inputTimezoneField selected')

        const outputAvailabilityFieldId: string | null = get(globalConfig, GCKey.OUTPUT_AVAILABILITY_FIELD_ID, null)
        if (!outputAvailabilityFieldId) throw new Error('No outputAvailabilityField selected')

        const outputLocalTimeAvailabilityFieldId: string | null = get(globalConfig, GCKey.OUTPUT_LOCAL_TIME_AVAILABILITY_FIELD_ID, null)

        const inputFields = [inputAvailabilityFieldId, inputTimezoneFieldId]
        if (inputFields.includes(outputAvailabilityFieldId) || inputFields.includes(outputLocalTimeAvailabilityFieldId)) throw new Error('Input and output fields must not overlap to avoid losing overwritten data')

        if (outputAvailabilityFieldId === outputLocalTimeAvailabilityFieldId) throw new Error('Output fields must be different')

        const query = await base.getTableById(tableId).getViewById(viewId).selectRecordsAsync()
        const allUpdates = query.records.map(r => ({
            id: r.id,
            fields: {
                [outputLocalTimeAvailabilityFieldId ?? outputAvailabilityFieldId]: adjustTimeAv(
                    r.getCellValueAsString(inputAvailabilityFieldId),
                    parseTimezoneToOffsetInHours(r.getCellValueAsString(inputTimezoneFieldId))
                ),
                [outputAvailabilityFieldId]: correctTimeAv(
                    r.getCellValueAsString(inputAvailabilityFieldId),
                    r.getCellValueAsString(inputTimezoneFieldId)
                ),
            },
        }))
        query.unloadData()

        for (let i = 0; i < allUpdates.length; i += 50) {
            await base.getTableById(tableId).updateRecordsAsync(allUpdates.slice(i, i + 50))
        }
    }

    return <div style={{ padding: "0 16px" }}>
        <h1>Time availability fixer</h1>
        <details>
            <summary>Context</summary>
            <p>On 2023-01-17 we discovered facilitator and participant availabilities had been recorded incorrectly. Where availabilities had been entered in a particular timezone, the offset had been inverted. For example, an availability entered in UTC-01:00 as 'M12:00 M13:00' should have been converted to 'M13:00 M14:00', but was instead converted to 'M11:00 M12:00'. This application undoes that conversion, given a time availability string (e.g. 'M12:00 M13:00, M14:00 M15:00') and a timezone (e.g. 'UTC-01:00').</p>
        </details>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '20px 0' }}>
            <div>
                <Label htmlFor="table-picker">Table</Label>
                <TablePickerSynced
                    id="table-picker"
                    placeholder="Pick the input table..."
                    globalConfigKey={GCKey.TABLE_ID}
                />
            </div>

            <div>
                <Label htmlFor="view-picker">View</Label>
                <ViewPickerSynced
                    id="view-picker"
                    placeholder="Pick the input view..."
                    table={participantsTable}
                    globalConfigKey={GCKey.VIEW_ID}
                />
            </div>

            <div>
                <Label htmlFor="availability-input-picker">Availability input</Label>
                <FieldPickerSynced
                    id="availability-input-picker"
                    placeholder="Pick the (broken) availability input..."
                    table={participantsTable}
                    globalConfigKey={GCKey.INPUT_AVAILABILITY_FIELD_ID}
                />
            </div>

            <div>
                <Label htmlFor="timezone-input-picker">Timezone input</Label>
                <FieldPickerSynced
                    id="timezone-input-picker"
                    placeholder="Pick the timezone input..."
                    table={participantsTable}
                    globalConfigKey={GCKey.INPUT_TIMEZONE_FIELD_ID}
                />
            </div>

            <div>
                <Label htmlFor="availability-ouput-picker">Availability output</Label>
                <FieldPickerSynced
                    id="availability-ouput-picker"
                    placeholder="Pick the (fixed) availability output..."
                    table={participantsTable}
                    globalConfigKey={GCKey.OUTPUT_AVAILABILITY_FIELD_ID}
                />
            </div>

            <div>
                <Label htmlFor="availability-local-ouput-picker">Availability local output (optional)</Label>
                <FieldPickerSynced
                    id="availability-local-ouput-picker"
                    placeholder="Pick the (local time) availability output..."
                    table={participantsTable}
                    globalConfigKey={GCKey.OUTPUT_LOCAL_TIME_AVAILABILITY_FIELD_ID}
                    shouldAllowPickingNone={true}
                />
            </div>
        </div>

        <Button
            variant="primary"
            icon="play"
            onClick={onSubmit}
            disabled={running}
        >
            Run
        </Button>
        {running && <Loader marginLeft={2} />}
        {error && <p style={{ color: '#8B0000' }}>{error}</p>}
    </div>;
}

initializeBlock(() => <HelloWorldTypescriptApp />);
