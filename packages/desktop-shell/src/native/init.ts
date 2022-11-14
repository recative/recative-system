import { WebSocketChannel} from "async-call-rpc/utils/node/websocket.server.js"
import { Msgpack_Serialization } from 'async-call-rpc/utils/node/msgpack.js'
import { Server } from 'ws'
import { AsyncCall } from 'async-call-rpc'
import * as server from "./electron"

const ws = new Server({ port: 12219 })
const channel =  new WebSocketChannel(ws)

AsyncCall(server, { channel:channel,serializer:Msgpack_Serialization() })