import { describe, expect, it } from "vitest";
import { buildMultiRowInsert, orderRowsByKey } from "./batch";

describe("buildMultiRowInsert", () => {
  it("numbers placeholders continuously and applies per-column casts", () => {
    const statement = buildMultiRowInsert(
      "t",
      ["id", "payload", "at"],
      ["uuid", "jsonb", "timestamptz"],
      [
        ["a", '{"x":1}', "2026-01-01T00:00:00.000Z"],
        ["b", '{"y":2}', "2026-01-02T00:00:00.000Z"],
      ],
    );
    expect(statement.text).toBe(
      "INSERT INTO t(id,payload,at) VALUES ($1::uuid,$2::jsonb,$3::timestamptz),($4::uuid,$5::jsonb,$6::timestamptz)",
    );
    expect(statement.values).toEqual([
      "a", '{"x":1}', "2026-01-01T00:00:00.000Z",
      "b", '{"y":2}', "2026-01-02T00:00:00.000Z",
    ]);
  });

  it("omits the cast when the column needs none", () => {
    const statement = buildMultiRowInsert("t", ["a"], [null], [["v"]]);
    expect(statement.text).toBe("INSERT INTO t(a) VALUES ($1)");
  });

  it("keeps a single row working", () => {
    const statement = buildMultiRowInsert("t", ["a", "b"], [null, null], [["1", "2"]]);
    expect(statement.text).toBe("INSERT INTO t(a,b) VALUES ($1,$2)");
  });

  // A silent column/value mismatch would shift every subsequent value into the
  // wrong column, which is far worse than a loud failure.
  it("rejects a row whose width does not match the column list", () => {
    expect(() => buildMultiRowInsert("t", ["a", "b"], [null, null], [["only-one"]])).toThrow(/2 values per row, got 1/);
  });

  it("rejects a cast list of the wrong length", () => {
    expect(() => buildMultiRowInsert("t", ["a", "b"], [null], [["1", "2"]])).toThrow(/2 columns but 1 casts/);
  });
});

describe("orderRowsByKey", () => {
  it("returns rows in the caller's order, not the database's", () => {
    const rows = [{ id: "c" }, { id: "a" }, { id: "b" }];
    expect(orderRowsByKey(rows, ["a", "b", "c"], (row) => row.id, "t").map((row) => row.id))
      .toEqual(["a", "b", "c"]);
  });

  // Dropping the row would silently shorten an API response; the caller asked
  // for a write and the database did not return it.
  it("throws instead of dropping a missing row", () => {
    expect(() => orderRowsByKey([{ id: "a" }], ["a", "b"], (row) => row.id, "写入时间线节点"))
      .toThrow(/写入时间线节点: 写入后未返回 id=b 的行/);
  });
});
