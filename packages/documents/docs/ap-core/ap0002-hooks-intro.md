---
sidebar_position: 0002
---

# AP0002: Introduction to AP Core Hooks

React users may be familiar with this concept. To Recative AP, it's an easy way to reuse
logics to make your life easier.

Since there isn't a concept of Virtual DOM in Recative AP, it is a more lenient
constraint on the programming paradigm, like, you can call a hook conditionally,
even in a for loop (but it doesn't mean you should do).

It looks like this:

```ts
import { useStore, AtomDefinition } from '@recative/ap-core'
import { TextureButton } from '@paperclip/ap-components'

const COUNT_STORE = AtomDefinition<number>(0);

const counterBinding = () => {
    const [getCount, setCount, subscribeCountUpdate] = useStore(COUNT_STORE)

    const button = TextureButton({
        default: require('resources/buttonDefaultTexture.png').default,
        hover: require('resources/buttonHoverTexture.png').default,
    })

    button.on(button.onTap, () => {
        setCount(getCount() + 1)
    })

    subscribeCountUpdate = (x) => {
        console.info(`Counter was updated to ${x}`)
    }

    return button
}
```

We've prepared a lot of hooks for different purposes, you can learn them from
following chapters.

## Pitfalls

There is one very counterintuitive thing that needs to be mentioned additionally
here, you can't use a hook within any asynchronous calls. If you insist on doing
this, please wrap the callback function with `useCallback` to ensure that the
Hooks work properly.

This won't work:

```ts
// Imports were ignored.

const counterBinding = () => {
    const button = TextureButton({
        default: require('resources/buttonDefaultTexture.png').default,
        hover: require('resources/buttonHoverTexture.png').default,
    })

    button.on(button.onTap, () => {
        const [startTimeout, ] = useTimeout(() => {
            console.log('Boo!')
        }, 100)
    })

    return button
}
```

This will work, but it's anti-pattern, will cause memory leak:

```ts
// Imports were ignored.

const counterBinding = () => {
    const button = TextureButton({
        default: require('resources/buttonDefaultTexture.png').default,
        hover: require('resources/buttonHoverTexture.png').default,
    })

    button.on(button.onTap, useCallback(() => {
        const [startTimeout, ] = useTimeout(() => {
            console.log('Boo!')
        }, 100)

        startTimeout()
    }))

    return button
}
```

The correct way to achieve this task:

```ts
// Imports were ignored.

const counterBinding = () => {
    const button = TextureButton({
        default: require('resources/buttonDefaultTexture.png').default,
        hover: require('resources/buttonHoverTexture.png').default,
    })

    const [startTimeout, ] = useTimeout(() => {
        console.log('Boo!')
    }, 100)

    button.on(button.onTap, () => {
        startTimeout()
    })

    return button
}
```

Each time a Hook is called, we are requesting a resource for different type of actions,
which will be released at the end of the interaction lifecycle, if we are not disposing
it manually. This means that the second example will cause a memory leak, which we don't
want to see.

React's Hooks and Recative AP's Hooks are only similar in form, but the mechanism
underneath completely different, React users should be careful about this.

# Motivation

The decision to be a "copy cat of React" is not because hooks are cool, fashion
or looks "React". It solves problems we've met while developing interactive
videos, like:

- Life cycle management: Trigger different behavior on different life cycle of player
  and interactive program itself;
- Resource management: Calling most hooks means declares a resource, these resource will
  be disposed while the interactive program is killed, This is a powerful way to avoid
  memory leaks;
- Optimize code organization: With hooks, we can easily organize reusable logic,
  and put logic that accomplishes a single task into a single place, which can
  enhance the maintainability of the code.
