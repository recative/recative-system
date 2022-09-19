//
//  Extensions.swift
//  App
//
//  Created by Sun on 2022/6/9.
//

import Foundation

//
//  ChildViewViewController.swift
//  App
//
//  Created by Sun on 2022/6/8.
//

import Foundation
import Capacitor
import UIKit

extension CAPBridgeViewController{
    open override var prefersHomeIndicatorAutoHidden: Bool{
        return true
    }
}

/**
 * auto play on safari
 */
extension WKWebViewConfiguration{
    open var mediaTypesRequiringUserActionForPlayback: WKAudiovisualMediaTypes{
        return WKAudiovisualMediaTypes.all
    }
    open var mediaPlaybackRequiresUserAction: Bool{
        return false
    }
}
