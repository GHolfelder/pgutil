import { assertStringIncludes, assertEquals } from "std/testing/asserts.ts";
import { Schema } from "../mod.ts";

Deno.test("Schema getColumnFields - unit", () => {
  const s = new Schema('MyTable', 'mt', [
    { name: 'id', sqlType: 'uuid', primaryKey: true },
    { name: 'name', sqlType: 'text' },
    { name: 'status', sqlType: 'smallint', enumValues: [{ value: 0, label: 'Off' }, { value: 1, label: 'On' }] }
  ]);

  const fields = s.getColumnFields(true, true);
  assertEquals(Array.isArray(fields), true);
  assertStringIncludes(fields.join(' '), 'mt.name AS "mt_name"');
});
