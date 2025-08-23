/**
 * Sample filter returning a property by ID.
 * @param data - Source object.
 * @param params - Parameters containing the property id.
 * @returns Selected data element.
 */
export default function (data, params) {
        return data[params.id]
}
