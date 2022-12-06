package com.jbcz.videorenderer

import android.os.CountDownTimer

class LoopAndScanCountDownTimer(millisInFuture:Long,countDownInterval:Long):CountDownTimer(millisInFuture,countDownInterval) {

    override fun onTick(millisUntilFinished: Long) {

    }

    override fun onFinish() {

    }
}