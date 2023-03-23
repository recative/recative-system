---
sidebar_position: 0006
---

# AP0006: Animation Hooks

This page describes hooks that you can use to create vivid animations, checkout
[this introduction](/pages/Hooks/hooks-intro) if you are new to Recative AP hooks.

* Low-level API bindings:
    * `useRaf`: Recative AP binding of `requestAnimationFrame`;
    * `useTicker`: Get low level time manager, which drives all animation hooks;
    * `useBatchPaint`: Batch a series of function calls to one;
    * `useThrottle`: Limit function call to a reasonable frequency.
* Basic animation utils:
    * `useLerp`: For making linear interpolation animation;
* [Animejs](https://animejs.com/) bindings:
    * `useAnime`: Binding of bare animejs;
    * `useAnimeTimeline`: Binding of `anime.Timeline`;
    * `useToggleAnime`: Anime instance, but could play forward and backward easily.

## Low-level API bindings

### useRaf

```TypeScript
const [playAnimation, stopAnimation] = useRaf(animationFramePaintingFunction)
```

`useRaf` is a binding of `requestAnimationFrame`, which implements garbage
collection and player event handling.

It returns a `play` function and a `stop` function, while stop function is 
called, the function will be removed from `ticker`, so the animation will 
restart.

### useTicker

```TypeScript
const ticker = useTicker()
```

Each Recative AP application (or, an interactive point) has a time manager which 
controls all the animations. the underlying tool is [`TimeMagic`](/classes/timemagic).

We don't encourage you to manipulate it directly. `useRaf` or other high level 
Hooks are sufficient to do most of the work.

### useBatchPaint

```TypeScript
const paint = useBatchPaint(paintFunction)
```

`useBatchPaint` can merge multiple calls to the same function into one and defer
execution to the next frame.

This hook is pretty useful while executing costly functions or controlling
the style of self-painted components.

Here's an example:

```TypeScript
const Square = () => {
    const result = new PIXI.Graphic()

    let stroke = 0x000000
    let fill = 0x000000

    const paint = useBatchPaint(() => {
        result.clear()
        result.beginFill(fill)
        result.lineStyle(4, stoke, 1)
        result.endFill()
    })

    return {
        result,
        get stroke() {
            return stroke
        },
        set stroke(x) {
            stroke = x
            paint()
        },
        get fill() {
            return fill
        },
        set fill(x) {
            fill = x
            paint()
        },
    }
}
```

### useThrottle

```TypeScript
const throttledFunction = useThrottle(originalFunction, controlledInterval)
```

Here's a brief definition of throttle from 
[Telerik](https://www.telerik.com/blogs/debouncing-and-throttling-in-javascript)'s blog:

> Throttling is a technique in which, no matter how many times the user fires 
> the event, the attached function will be executed only once in a given time 
> interval.

The useThrottle hook implements a throttle function with Recative AP's player lifecycle
binding.

Say, we want to limit function call to 12 fps:

```TypeScript
const costlyCall = useThrottle((x: string) => {
    costlyCall(x)
}, 1000 / 12)

costlyCall('Hello; World')
```

## Basic animation utils

### useLerp

```TypeScript
const [lerpFunction] = useLerp(parameterGetter, parameterSetter, damping, threshold)
```

> Lerp is the nickname for Linear Interpolation between two points. It's a 
> fairly simple effect to implement but can really improve the look of your 
> animations if you're moving an object from a point A to point B.

You can get more detail about Lerp animation from 
[Rachel Smith's article](https://codepen.io/rachsmith/post/animation-tip-lerp).

This hook returns a function, you can call it when you want to change the parameter
to a new value smoothly, in the following document, we define the value you want
to change to as **target value**.

We need to define:
* A **getter**, which is a function that returns the parameter we want to 
  control;
* A **setter**, which is a function that maps parameter to visual objects;
* **damping**, controls the speed of your animation, smaller means slower 
  animation;
* **threshold**, the animation stops when the difference between the parameter 
  and the target value is small enough, and this parameter defines the threshold
  value for the minimum difference.

Here's a simple example:

```TypeScript
const square = Square()
const [lerpX] = useLerp(
    () => square.result.position.x,
    (x) => square.result.position.x = x,
)

// Move it when you want to:
lerpX(20)
```

And here's a more complex example:

```TypeScript
let progress = 0;
const [lerpProgress] = useLerp(
    () => x,
    (x) => {
        // This is very very import, if you find that your LERP animation is 
        // stuck, then most likely it is because the parameters are not being 
        // updated.
        progress = x
        square.result.position.set(x * 0.5, x * x * 0.25);
    }
)
```

##  [Animejs](https://animejs.com/) binding

It's still a mess, we're discussing how to design the API properly.

