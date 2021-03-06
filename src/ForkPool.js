import { fork } from 'child_process';
import genericPool from 'generic-pool';
import os from 'os';
import singletonLogger from './loggers/SingletonLogger';

/**
 * Fork Pool
 *
 * Pool of child_process.fork().
 */
export default class ForkPool {
  /**
   * Init Pool
   * @param {*} options
   */
  initPool(options) {
    const factory = {
      create() {
        const forked = fork(options.processFilePath);
        forked.on('exit', function (code, signal) {
          singletonLogger.debug(`Forked is exited with code: ${code}, signal: ${signal}`);
        });

        return forked;
      },
      destroy(forked) {
        forked.kill();
      },
      validate(forked) {
        if (forked.exitCode !== null || forked.signalCode !== null) {
          singletonLogger.info('Child-process is terminated by the OS. Forking another child...');
          return false;
        }

        return true;
      },
    };

    const opts = {
      max: options.maxPoolSize || os.cpus().length,
      min: options.minPoolSize || 2,
      idleTimeoutMillis: Number.MAX_SAFE_INTEGER, // work-arround since there is a bug with node-pool/lib/DefaultEvictor.js
      softIdleTimeoutMillis: options.idleTimeoutMillis || 30000,
      evictionRunIntervalMillis: options.evictionRunIntervalMillis || 5000,
      acquireTimeoutMillis: options.acquireTimeoutMillis || 6000,
      testOnBorrow: true,
    };

    singletonLogger.debug(
      `Create fork-queue with options [min-pool-size: ${opts.min}, max-pool-size: ${opts.max}, idle-timeout-millis: ${opts.softIdleTimeoutMillis}]`,
    );

    this.pool = genericPool.createPool(factory, opts);
  }

  /**
   * Return child_process from Pool
   */
  async acquire() {
    if (this.isPoolDrained()) {
      throw new Error('Fork.Pool is not initialized.');
    }
    return await this.pool.acquire();
  }

  /**
   * Destroy child_process
   *
   * @param {*} forked
   */
  destroy(forked) {
    this.pool.destroy(forked);
  }

  /**
   * Put child_process back to Pool
   *
   * @param {*} forked
   */
  release(forked) {
    this.pool.release(forked);
  }

  /**
   * Drain pool during shutdown.
   *
   * Only call this once in your application -- at the point you want
   * to shutdown and stop using this pool.
   */
  async drainPool() {
    if (!this.pool) {
      return;
    }

    await this.pool.drain();
    await this.pool.clear();
    delete this.pool;

    singletonLogger.info('Fork.Pool is drained.');
  }

  /**
   * true if Pool is drained. false otherwise
   */
  isPoolDrained() {
    return !this.pool;
  }
}
