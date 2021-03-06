const idx = Math.floor(Math.random() * 50); // Random integer from 0 to 50
const times = [100, 150, 250, 300, 450, 500, 600, 700, 800, 900, 1000];

/**
 * Receive message from main-process and process it
 */
process.on('message', async (message) => {
  console.info('Process message %s', JSON.stringify(message));

  const response = await longRunTask();
  // Send response back to main-process
  process.send(response);
});

const longRunTask = async () => {
  try {
    await wait(times[idx % times.length]);

    if (idx % 12 === 0) {
      throw new Error('Just random error');
    }

    return { value: { status: 'OK' } };
  } catch (err) {
    return { value: { status: 'ERROR' }, error: { message: err.message } };
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
