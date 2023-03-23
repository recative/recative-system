---
sidebar_position: 0004
---

# AP0004: Event Target Hooks

An event target hook expose the event pivot of the current interactive program, 
we can dispatch a signal, the scope who cares about this signal could subscribe 
it and handle its own logic separately.

## How to use it

Like store definition, we need to define a new event type:

```ts
import { EventDefinition } from '@recative/ap-core'

const START_RUNNING_TASK_EVENT = EventDefinition<{ taskName: string }>()
```

`EventDefinition` accepts a generic parameter, which indicates the `detail` of
the event.

Then we need to get the event pivot from your component.

```ts
import { useStore } from '@recative/ap-core'
import { TextureButton } from '@paperclip/ap-components'

export const StartButton = () => {
    const eventTarget = useEventTarget()

    const button = TextureButton({
        default: require('resources/buttonDefaultTexture.png').default,
        hover: require('resources/buttonHoverTexture.png').default,
    })

    button.on(button.onTap, () => {
        eventTarget.fire(START_RUNNING_TASK_EVENT, { taskName: 'training-task' })
    })
}
```

You can subscribe this event in another component, like this:

```ts
export const Main = () => {
    const eventTarget = useEventTarget()

    eventTarget.on(START_RUNNING_TASK_EVENT, (x) => {
        console.log(`Received task ${x.detail.taskName}`)
    })
}
```

## Some implementation details

`useStore` was driven by [`EventTarget2`](/classes/eventtarget2), compare with
native [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget),
we solved the compatibility problem via patching a polyfill and implemented a type
safe mechanism to make sure each event has a corresponding type definition.

This type-safe mechanism is achieved by force overwrite the type definition of 
string, and you can see this oddity in the source code.
