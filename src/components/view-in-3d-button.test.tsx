import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { ViewIn3DButton } from "./view-in-3d-button";

vi.mock("sonner", () => ({ toast: vi.fn() }));

describe("ViewIn3DButton", () => {
  it("mostra o botão e avisa qual unidade terá o tour", async () => {
    render(<ViewIn3DButton unit="903" />);

    await userEvent.click(screen.getByRole("button", { name: "Ver em 3D" }));

    expect(toast).toHaveBeenCalledWith(
      "O tour 3D da unidade 903 chega na próxima versão.",
    );
  });
});
