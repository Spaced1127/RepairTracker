import { describe, expect, it } from "vitest";
import { render, toE164 } from "@/lib/notify";

describe("message templates", () => {
  it("fills placeholders and blanks unknown ones", () => {
    const out = render("Hi {{first_name}}, {{device}} #{{ticket_number}} {{nope}}ok {{ status_link }}", {
      first_name: "Sam", device: "Sony PS5", ticket_number: "1004", status_link: "https://x.test/s/1",
    });
    expect(out).toBe("Hi Sam, Sony PS5 #1004 ok https://x.test/s/1");
  });
});

describe("phone numbers for texting", () => {
  it.each([
    ["(919) 555-0134", "+19195550134"],
    ["919-555-0134", "+19195550134"],
    ["1 919 555 0134", "+19195550134"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("normalizes %s", (raw, expected) => expect(toE164(raw)).toBe(expected));

  it.each(["555-0134", "", "abc"])("rejects %j", (raw) => expect(toE164(raw)).toBeNull());
});
