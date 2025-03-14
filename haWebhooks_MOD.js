const http = require('http');
const https = require('https');

module.exports = {
  category: "API",
  data: {
    name: "Home Assistant Webhook",
  },
  info: {
    source: "https://github.com/LucxN",
    creator: "Made with <3 by @lucxanul",
  },
  UI: [
    {
      element: "input",
      name: "Server Address",
      storeAs: "serverIp"
    },
    "-",
    {
      element: "input",
      name: "Port",
      storeAs: "port"
    },
    "-",
    {
      element: "input",
      name: "Webhook",
      storeAs: "webhook_id"
    },
    "-",


    {
      element: "condition",
      storeAs: "ifError",
      storeActionsAs: "ifErrorActions",
      name: "If Error"
    }
  ],

  subtitle: (data, constants) => {
    return `Send webhook to ${data.serverIp}:${data.port}`;
  },
  compatibility: ["Any"],

  async run(values, message, client, bridge) {
    const serverIp = await bridge.transf(values.serverIp);
    const port = await bridge.transf(values.port);
    const webhook_id = await bridge.transf(values.webhook_id);
    const messageText = "Triggered by BMD";

    try {
      const response = await sendHomeAssistantWebhook(serverIp, port, webhook_id, messageText);
      if (!response.success) {
        throw new Error(response.error || 'Connection to host has failed');
      }
    } catch (error) {
      console.error("Home Assistant Webhook MOD Error:", error);
      bridge.runner(values.ifError, values.ifErrorActions);
    }
  },
};

async function sendHomeAssistantWebhook(serverIp, port, webhook_id, message) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      data: {
        message: message,
        timestamp: new Date().toISOString()
      }
    });

    const options = {
      hostname: serverIp,
      port: port,
      path: `/api/webhook/${webhook_id}`,
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    try {
      const protocol = serverIp.startsWith('https://') ? https : http;
      
      const req = protocol.request(options, (response) => {
        let responseData = '';

        response.on('data', (chunk) => {
          responseData += chunk;
        });

        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ success: true, data: responseData ? JSON.parse(responseData) : {} });
          } else {
            resolve({ success: false, error: `Error for http or https: ${response.statusCode}` });
          }
        });

        response.on('error', (error) => {
          console.error('Error in response:', error);
          resolve({ success: false, error: error.message });
        });
      });

      req.on('error', (error) => {
        console.error('Error sending webhook:', error);
        resolve({ success: false, error: error.message });
      });

      req.write(data);
      req.end();
    } catch (error) {
      console.error('Error in request setup:', error);
      resolve({ success: false, error: error.message });
    }
  });
}