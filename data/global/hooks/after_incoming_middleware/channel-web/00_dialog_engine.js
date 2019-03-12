//CHECKSUM:bb1db7df0950c6e39c53c9ab3d80b0f6bd0691fcc51aaf65e29b0e766a1717d3
"use strict";

const messageTypesToDiscard = ['request_start_conversation'];

if (messageTypesToDiscard.includes(event.type)) {
  event.setFlag(bp.IO.WellKnownFlags.SKIP_DIALOG_ENGINE, true);
}