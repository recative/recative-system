---
sidebar_position: 0005
---

# AP0005: Style Sheet hooks

Recative AP use [`stylesheets`](/classes/stylesheet) to expose component styles, it's
the only recommended way to update component styles across scopes (like 
components or hooks).

## How to use it

Like store definition, we need to SHOUT OUT A NEW STYLE DEFINITION.

```ts
import { StyleDefinition } from '@recative/ap-core'

export const LOGO_OPACITY_STYLE = StyleDefinition()
```

We recommend adding a suffix `_STYLE` to the variable name.

Then, we can register the style to the style sheet in our component:

```ts
import * as PIXI from 'pixi.js'
import { useStylesheet } from '@recative/ap-core'

const Logo = () => {
    const stylesheet = useStylesheet()
    
    const logo = PIXI.Sprite.from(require('./logo.png').default)

    stylesheet.register(
        LOGO_OPACITY_STYLE,
        () => logo.alpha,
        (x) => logo.alpha = x,
    )

    return logo
}
```

What we've done is:
* Get the style sheet of the current application with `useStylesheet`;
* Register it with `stylesheet.register`.

When registering, we need to provide three parameters, the definition of the 
style, the setter, and the getter of the target.

Please notice that style could only handle `number`, other types of data must be
mapped to numbers.

Then, we may want to operate this style from other scopes:

```ts
import { useStylesheet } from '@recative/ap-core'

import { LOGO_OPACITY_STYLE } from './Logo'

const controllerHook = () => {
    const stylesheet = useStylesheet();

    stylesheet.styles[LOGO_OPACITY_STYLE] = 0.5;
}
```

## When to use

The main purpose of designing `stylesheet` is to make sure animation logic could
be handled in one place. In Recative AP, [anime.js](https://animejs.com/) is used to 
handle animation, we only need to pass `stylesheet.styles` as animation target,
Styles from multiple elements can then be adjusted centrally, which reduces the 
risk of fragmented animation logic, (it's painful).
