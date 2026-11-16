// Adiciona matchers como toBeInTheDocument() e toHaveTextContent().
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta os componentes depois de cada teste, para um não afetar o outro.
afterEach(() => {
  cleanup();
});
