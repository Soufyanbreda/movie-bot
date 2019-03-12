//CHECKSUM:25a47d624d6bfa64f982a8fc09baa38a2e64ccd980ffe857566b51de9fc7d009
"use strict";

const chatOptions = {
  hideWidget: true,
  config: {
    botConvoTitle: 'Bot Emulator',
    enableReset: true,
    enableTranscriptDownload: true
  }
};
const params = {
  m: 'channel-web',
  v: 'Fullscreen',
  options: JSON.stringify(chatOptions) // Bot will be available at $EXTERNAL_URL/s/$BOT_NAME

};
bp.http.createShortLink(botId, `${process.EXTERNAL_URL}/lite/${botId}/`, params);