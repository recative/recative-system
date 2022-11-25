//
//  DataStruct.swift
//  Plugin
//
//  Created by Sun on 2022/8/5.
//  Copyright © 2022 Max Lynch. All rights reserved.
//

import Foundation

public protocol Queue {
    associatedtype Element
    mutating func enqueue(_ element: Element) -> Bool
    mutating func dequeue() -> Element?
    var isEmpty: Bool { get }
    var peek: Element? { get }
}

public struct ArrayQueue<Element>: Queue {
    private var array: [Element] = []
    public init() {}
    
    public var isEmpty: Bool {
        array.isEmpty
    }
    
    public var peek: Element? {
        array.first
    }
    
    @discardableResult
    public mutating func enqueue(_ element: Element) -> Bool {
        array.append(element)
        return true
    }
    
    public mutating func dequeue() -> Element? {
        isEmpty ? nil : array.removeFirst()
    }
}

public struct Stack<Element> {
    var array:[Element] = []
    mutating func push(_ element: Element) -> Bool {
        array.append(element)
        return true
    }
    mutating func pop() -> Element? {
        isEmpty ? nil : array.removeLast()
    }
    var peek : Element? {
        array.last
    }
    var isEmpty:Bool {
        array.isEmpty
    }
}
