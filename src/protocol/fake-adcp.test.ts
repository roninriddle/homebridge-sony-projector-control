/* Raw commands must not turn the loopback test emulator into a general object writer. */
import assert from "node:assert/strict";
import { createConnection } from "node:net";
import { startFakeAdcp } from "./fake-adcp.helpers.ts";
import { test } from "node:test";

test("fake ADCP rejects property injection and out-of-range levels", async () => {

  const fake = await startFakeAdcp({ state: { power: "on" } });
  const socket = createConnection({ host: fake.host, port: fake.port });
  const replies: string[] = [];
  let buffer = "";
  const ready = new Promise<void>((resolve) => {

    socket.on("data", chunk => {

      buffer += chunk.toString();
      const lines = buffer.split("\r\n");

      buffer = lines.pop()!;
      replies.push(...lines);

      if(replies.length === 5) { resolve(); }
    });
    socket.once("connect", () => socket.write("__proto__ \"polluted\"\r\nconstructor \"polluted\"\r\nbrightness 101\r\nbrightness 42\r\n"));
  });

  try {

    await ready;
    assert.deepEqual(replies, [ "NOKEY", "err_cmd", "err_cmd", "err_val", "ok" ]);
    assert.equal(fake.state.brightness, 42);
    assert.equal(fake.state.contrast, 75);
    assert.equal(Object.getPrototypeOf(fake.state), Object.prototype);
  } finally {

    socket.destroy();
    await fake.close();
  }
});
