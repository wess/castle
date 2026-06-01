export const demux = (input: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> => {
  const reader = input.getReader();
  let buffer: Uint8Array = new Uint8Array(new ArrayBuffer(0));

  const append = (chunk: Uint8Array): Uint8Array => {
    const out = new Uint8Array(new ArrayBuffer(buffer.length + chunk.length));
    out.set(buffer, 0);
    out.set(chunk, buffer.length);
    return out;
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.length > 0) controller.enqueue(buffer);
        controller.close();
        return;
      }
      buffer = append(value);
      while (buffer.length >= 8) {
        const len = (buffer[4]! << 24) | (buffer[5]! << 16) | (buffer[6]! << 8) | buffer[7]!;
        if (buffer.length < 8 + len) break;
        controller.enqueue(buffer.slice(8, 8 + len));
        buffer = buffer.slice(8 + len);
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
};
