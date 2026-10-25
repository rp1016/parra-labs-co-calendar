import { describe, expect, it } from "vitest";
import { confirmAction, useConfirmStore } from "./confirm";

describe("confirm", () => {
  it("resolves the pending request when the user chooses", async () => {
    const pending = confirmAction("¿Eliminar?", { danger: true });
    expect(useConfirmStore.getState().request?.message).toBe("¿Eliminar?");
    expect(useConfirmStore.getState().request?.danger).toBe(true);

    useConfirmStore.getState().settle(true);

    await expect(pending).resolves.toBe(true);
    expect(useConfirmStore.getState().request).toBeNull();
  });

  it("dismisses the previous request when another one opens", async () => {
    const first = confirmAction("Primera");
    const second = confirmAction("Segunda");

    await expect(first).resolves.toBe(false);
    expect(useConfirmStore.getState().request?.message).toBe("Segunda");

    useConfirmStore.getState().settle(false);
    await expect(second).resolves.toBe(false);
  });
});
