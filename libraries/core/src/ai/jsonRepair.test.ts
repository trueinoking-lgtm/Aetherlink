import { parseJSONObject, parseJSONArray, repairJSONObject } from './jsonRepair';

describe('jsonRepair', () => {
  it('parses JSON inside markdown fences', () => {
    const raw = '```json\n{"title":"Dev","company":"Acme"}\n```';
    const obj = parseJSONObject<{ title: string }>(raw);
    expect(obj.title).toBe('Dev');
  });

  it('repairs array with think blocks stripped', () => {
    const raw = '[{"original":"a","rewritten":"b","change_reason":"c"}]';
    const arr = parseJSONArray<unknown[]>(raw);
    expect(arr).toHaveLength(1);
  });

  it('repairJSONObject isolates object', () => {
    const cleaned = repairJSONObject('Here is output: {"ok":true}');
    expect(JSON.parse(cleaned)).toEqual({ ok: true });
  });
});
