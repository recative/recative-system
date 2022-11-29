package io.github.recative.mobile_shell;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private String ACTION_LOWMEMORY_STR="action_low_memory";
    @Override
    public void onLowMemory() {
        super.onLowMemory();
        sendBroadcast(new Intent(ACTION_LOWMEMORY_STR));
    }
}
