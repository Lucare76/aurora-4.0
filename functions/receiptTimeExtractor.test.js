const {extractReceiptTime} = require("./receiptTimeExtractor");

describe("receiptTimeExtractor", () => {
  test("12/03/2026 14:37", () => {
    const text = "SCONTRINO\n12/03/2026 14:37\nTOTALE 10,50";
    expect(extractReceiptTime(text)).toBe("14:37");
  });

  test("12/03/2026 ore 9:05", () => {
    const text = "DATA 12/03/2026 ore 9:05\nTOTALE 5,00";
    expect(extractReceiptTime(text)).toBe("09:05");
  });

  test("DATA 12.03.2026 ORA 18.42", () => {
    const text = "DATA 12.03.2026 ORA 18.42\nIMPORTO 20,00";
    expect(extractReceiptTime(text)).toBe("18:42");
  });

  test("multiple numeric sequences but only one true time", () => {
    const text = [
      "TICKET 123456",
      "RIF OPERAZIONE 987654",
      "DATA 12/03/2026 ORA 11:28",
      "AUTH 482910",
    ].join("\n");
    expect(extractReceiptTime(text)).toBe("11:28");
  });

  test("no time present => null", () => {
    const text = "SUPERMERCATO XYZ\nDATA 12/03/2026\nTOTALE 14,99\nRIF 999111";
    expect(extractReceiptTime(text)).toBeNull();
  });
});
