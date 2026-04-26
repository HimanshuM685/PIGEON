import { Schema, msgpackEncodingDataToJSONEncodingData, jsonEncodingDataToMsgpackEncodingData, } from '../encoding.js';
/* eslint-disable class-methods-use-this */
export class UntypedSchema extends Schema {
    defaultValue() {
        return undefined;
    }
    isDefaultValue(data) {
        return data === undefined;
    }
    prepareMsgpack(data) {
        // Value is already MsgpackEncodingData, since it is returned as such from
        // fromPreparedMsgpack and fromPreparedJSON
        return data;
    }
    fromPreparedMsgpack(encoded, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _rawStringProvider) {
        return encoded;
    }
    prepareJSON(data, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options) {
        return msgpackEncodingDataToJSONEncodingData(data);
    }
    fromPreparedJSON(encoded) {
        return jsonEncodingDataToMsgpackEncodingData(encoded);
    }
}
//# sourceMappingURL=untyped.js.map