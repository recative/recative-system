A remote store hook store creates a storage slot that is synchronized across devices.
It looks like `useStore`, but has more complex behavior.

## How to use it

Like the `useStore` hook, we need to define a store before using it:

```TypeScript
import { Boolean } from 'runtypes';
import { RemoteAtomDefinition } from '@recative/ap-core'

const FINISHED_TASK_STORE = RemoteAtomDefinition(
    'CryptographyHall/P1', // Slot ID
    false, // Fallback value
    Boolean, // `runtypes` type checker
)
```

We need to provide three parameters to this function:
* `slotId`: The id of data slot on the remote server, it's the name or id of the 
   interactive point you are developing;
* `fallbackValue`: If the data was not loaded, or type checking failed, a fallback value
   would be returned, the value could be this parameter or local cache, check 
   “Fallback values” for more details;
* `typeGuard`: Since all the data stored on the remote server are not type-safe, we must
   provide a type checker to make sure that the data type is correct, and if the type 
   check fails, the data in the storage slot will fall back to the fallback value.

Then we can call the `useRemoteStore` hook:

```TypeScript
const [getFinishedTask, setFinishedTask, subscribeFinishedTaskUpdate] = useRemoteStore(FINISHED_TASK_STORE)
```

Like `useStore`, `useRemoteStore` will return three functions:
* `getFinishedTask`: Returns the value in the slot, would return fallbackValue data is
  not ready;
* `setFinishedTask`: Set the value in the slot;
* `subscribeFinishedTaskUpdate`: Would be triggered when the data loaded, or updated 
  manually on local machine.

## Fallback values

When you called value setter, a copy of your data will be stored in the `localStorage`, 
this value will become the new fallback value until the user cleared its `localStorage` 
or the data is broken.
