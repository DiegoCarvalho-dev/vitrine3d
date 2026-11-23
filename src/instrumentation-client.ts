import { z } from "zod";

// Runs in the browser before the app (Next.js). Zod 4 probes `new Function`
// to compile faster validators; under our CSP (no eval, issue #86) the probe
// is refused and shows up as a CSP violation. Validation works the same
// without that shortcut.
z.config({ jitless: true });
