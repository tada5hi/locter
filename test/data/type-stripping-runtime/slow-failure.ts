// Fails while running, after a delay (the retry is still pending then).
await new Promise((resolve) => setTimeout(resolve, 50));

throw new Error('late failure');
