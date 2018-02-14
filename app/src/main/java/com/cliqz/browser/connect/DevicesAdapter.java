package com.cliqz.browser.connect;

import android.support.v7.widget.AppCompatImageButton;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.PopupMenu;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.TelemetryKeys;

import java.util.ArrayList;

/**
 * @author Stefano Pacifici
 */
class DevicesAdapter extends RecyclerView.Adapter<DevicesAdapter.DeviceHolder> {
    private final PairedDevicesFragment pairedDevicesFragment;
    private final LayoutInflater inflater;
    private ArrayList<DevicesListEntry> entries = null;

    DevicesAdapter(PairedDevicesFragment pairedDevicesFragment) {
        this.pairedDevicesFragment = pairedDevicesFragment;
        this.inflater = LayoutInflater.from(pairedDevicesFragment.getContext());
    }

    void setEntries(ArrayList<DevicesListEntry> entries) {
        this.entries = entries;
        this.notifyDataSetChanged();
    }

    @Override
    public DeviceHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        final View view = inflater.inflate(R.layout.view_sync_device_entry, parent, false);
        return new DeviceHolder(view);
    }

    @Override
    public void onBindViewHolder(DeviceHolder holder, int position) {
        final DevicesListEntry entry = entries.get(position);
        holder.deviceNameText.setText(entry.name);
        switch (entry.state) {
            case CONNECTED:
                holder.deviceNameText.setVisibility(View.VISIBLE);
                holder.deviceStatusText.setVisibility(View.VISIBLE);
                holder.connectingMessageText.setVisibility(View.INVISIBLE);
                holder.deviceStatusText.setText(R.string.device_paired_and_connected);
                break;
            case PAIRING:
                holder.deviceNameText.setVisibility(View.INVISIBLE);
                holder.deviceStatusText.setVisibility(View.INVISIBLE);
                holder.connectingMessageText.setVisibility(View.VISIBLE);
                break;
            default:
                holder.deviceNameText.setVisibility(View.VISIBLE);
                holder.deviceStatusText.setVisibility(View.VISIBLE);
                holder.connectingMessageText.setVisibility(View.INVISIBLE);
                holder.deviceStatusText.setText(R.string.device_paired_but_offline);
                break;
        }

        holder.mEntry = entry;
    }

    @Override
    public int getItemCount() {
        return entries != null ? entries.size() : 0;
    }

    class DeviceHolder extends RecyclerView.ViewHolder implements View.OnClickListener {
        final TextView deviceNameText;
        final TextView deviceStatusText;
        final TextView connectingMessageText;

        final AppCompatImageButton optsButton;
        DevicesListEntry mEntry;

        DeviceHolder(View itemView) {
            super(itemView);
            this.deviceNameText = (TextView) itemView.findViewById(R.id.device_name);
            this.deviceStatusText = (TextView) itemView.findViewById(R.id.device_status);
            this.connectingMessageText = (TextView) itemView.findViewById(R.id.connecting_message);

            this.optsButton = (AppCompatImageButton) itemView.findViewById(R.id.actions_button);
            this.optsButton.setOnClickListener(this);
        }

        @Override
        public void onClick(View v) {
            if (mEntry == null) {
                return;
            }

            final PopupMenu menu = new PopupMenu(pairedDevicesFragment.getContext(), v);
            menu.getMenuInflater().inflate(R.menu.menu_contextual_paired_device_actions, menu.getMenu());
            menu.setOnMenuItemClickListener(new PopupMenu.OnMenuItemClickListener() {
                @Override
                public boolean onMenuItemClick(MenuItem item) {
                    switch (item.getItemId()) {
                        case R.id.action_unpair_device:
                            if (pairedDevicesFragment.mService != null) {
                                pairedDevicesFragment.mService.disconnectPeer(mEntry.id);
                                pairedDevicesFragment.telemetry.sendConnectSignal(TelemetryKeys.REMOVE);
                            }
                            return true;
                        case R.id.action_rename_device:
                            RenameDeviceDialog.show(pairedDevicesFragment, mEntry.id);
                            pairedDevicesFragment.telemetry.sendConnectSignal(TelemetryKeys.RENAME);
                        default:
                            return false;
                    }
                }
            });
            menu.show();
        }
    }

}
