A store hook stores a piece of information, it works like `useState` in React,
and the design concept comes from [Recoil](https://recoiljs.org/).

## How to use it

We need to define a store before using it:

```TypeScript
import { AtomDefinition } from '@recative/ap-core'

const COUNT_STORE = AtomDefinition<number>(0)
```

In Recative AP, the variables used to define Atom are usually SCREAMING_SNAKE_CASE,
the name of the variable should end with `_STORE`, JUST SHOUT IT OUT!

You can consume it with the `useStore` hook, it will return three methods:
* **getter**: You can get value from the store with this method;
* **setter**: You can replace the value in the store with this method;
* **subscriber**: You can subscribe the value update with this method.

Here's an example:

```TypeScript
const [getCount, setCount, subscribeCountUpdate] = useStore(COUNT_STORE)

getCount() // it will return 0
setCount(1) // The value will be update to 1
subscribeCountUpdate((x) => {
    // Each time the value changes, this function will be called, `x` is the 
    // value updated to.
})
```

## Pitfall

Do NOT Do set the store value in a high frequency, as this can cause performance
issue, if you need to update a value to update the parameter of a specific visual
objects, use stylesheet instead.

## Some implementation details

The logic behind `useStore` is handled by [`AtomStore`](modules#atomstore), this
is why there's something called `AtomDefinition`, when the Recative AP app initialized,
values in AtomDefinition will be copied to `AtomStore`, when the app is killed, 
the values that have been stored are automatically cleaned up by Recative AP and 
user's browser.

You can check out the source code to get more detail.