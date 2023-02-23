import type { OpenPromise } from './OpenPromise';
import type { FrameFillingQueue } from './FrameFillingQueue';
import type { SequentialQueue } from './SequentialQueue';
import type { TimeSlicingQueue } from './TimeSlicingQueue';

export type QueuedTask = (() => void) | OpenPromise<any>;

export type Queue = SequentialQueue | FrameFillingQueue | TimeSlicingQueue;
