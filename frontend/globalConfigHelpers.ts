import type GlobalConfig from "@airtable/blocks/dist/types/src/global_config";

/** Keys for storing data in the AirTable global config */
export enum GCKey {
  TABLE_ID = "tableId",
  VIEW_ID = "viewId",
  INPUT_AVAILABILITY_FIELD_ID = "inputAvailabilityFieldId",
  INPUT_TIMEZONE_FIELD_ID = "inputTimezoneFieldId",
  OUTPUT_AVAILABILITY_FIELD_ID = "outputAvailabilityFieldId",
}

export const get = <T,>(globalConfig: GlobalConfig, key: GCKey | string, ifMissing: T): string | T => {
  const res = globalConfig.get(key)
  return typeof res === "string" ? res : ifMissing;
}