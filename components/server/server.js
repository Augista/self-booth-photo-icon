// const WebSocket = require("ws")
// const wrtc = require("wrtc")

// const wss = new WebSocket.Server({ port: 4000 })

// let peerConnection

// wss.on("connection", async (ws) => {
//   console.log("Client connected")

//   peerConnection = new wrtc.RTCPeerConnection({
//     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
//   })

//   // When ICE candidate generated
//   peerConnection.onicecandidate = ({ candidate }) => {
//     if (candidate) {
//       ws.send(JSON.stringify({ type: "candidate", candidate }))
//     }
//   }

//   // TODO: Add video track from camera here
//   // For now we create empty stream placeholder

//   ws.on("message", async (message) => {
//     const data = JSON.parse(message)

//     if (data.type === "offer") {
//       await peerConnection.setRemoteDescription(data.offer)

//       const answer = await peerConnection.createAnswer()
//       await peerConnection.setLocalDescription(answer)

//       ws.send(JSON.stringify({ type: "answer", answer }))
//     }

//     if (data.type === "candidate") {
//       try {
//         await peerConnection.addIceCandidate(data.candidate)
//       } catch (err) {
//         console.error(err)
//       }
//     }
//   })
// })

// console.log("WebRTC server running on ws://localhost:4000")

/**
 * Canon EDSDK Server for Next.js Frontend
 * Handles camera control via HTTP API
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bindings = require('bindings');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Load Canon EDSDK native bindings
// Point to your compiled EDSDK binding
let canonSDK;
try {
  // Adjust path based on your EDSDK binding location
  canonSDK = bindings('edsdk');
  console.log('✓ Canon EDSDK bindings loaded successfully');
} catch (err) {
  console.error('✗ Failed to load Canon EDSDK bindings:', err.message);
  console.error('Make sure you have compiled the EDSDK bindings.');
  process.exit(1);
}

// ==================== CAMERA MANAGER ====================
class CameraManager {
  constructor() {
    this.cameras = [];
    this.selectedCamera = null;
    this.liveViewActive = false;
  }

  // Initialize EDSDK
  initialize() {
    try {
      canonSDK.InitializeSDK();
      console.log('✓ EDSDK initialized');
      return { success: true, message: 'EDSDK initialized' };
    } catch (err) {
      console.error('Failed to initialize EDSDK:', err);
      return { success: false, error: err.message };
    }
  }

  // Get list of connected cameras
  getCameras() {
    try {
      const cameras = canonSDK.GetCameraList();
      this.cameras = cameras || [];
      console.log(`✓ Found ${this.cameras.length} camera(s)`);
      return {
        success: true,
        cameras: this.cameras.map((cam, idx) => ({
          id: idx,
          model: cam.model || 'Unknown',
          port: cam.port || 'USB',
          description: cam.description || ''
        }))
      };
    } catch (err) {
      console.error('Failed to get cameras:', err);
      return { success: false, error: err.message };
    }
  }

  // Connect to camera by ID
  connectCamera(cameraId) {
    try {
      if (cameraId < 0 || cameraId >= this.cameras.length) {
        return { success: false, error: 'Invalid camera ID' };
      }

      const result = canonSDK.ConnectCamera(cameraId);
      this.selectedCamera = cameraId;
      console.log(`✓ Connected to camera ${cameraId}`);
      return { success: true, message: `Connected to camera ${cameraId}` };
    } catch (err) {
      console.error('Failed to connect camera:', err);
      return { success: false, error: err.message };
    }
  }

  // Take a photo
  takePhoto() {
    try {
      if (this.selectedCamera === null) {
        return { success: false, error: 'No camera selected' };
      }

      const result = canonSDK.TakePicture(this.selectedCamera);
      console.log('✓ Photo captured');
      return {
        success: true,
        message: 'Photo captured successfully',
        filePath: result?.filePath || ''
      };
    } catch (err) {
      console.error('Failed to take photo:', err);
      return { success: false, error: err.message };
    }
  }

  // Start live view
  startLiveView() {
    try {
      if (this.selectedCamera === null) {
        return { success: false, error: 'No camera selected' };
      }

      canonSDK.StartLiveView(this.selectedCamera);
      this.liveViewActive = true;
      console.log('✓ Live view started');
      return { success: true, message: 'Live view started' };
    } catch (err) {
      console.error('Failed to start live view:', err);
      return { success: false, error: err.message };
    }
  }

  // Get live view frame
  getLiveViewFrame() {
    try {
      if (!this.liveViewActive) {
        return { success: false, error: 'Live view not active' };
      }

      const frameData = canonSDK.GetLiveViewFrame(this.selectedCamera);
      return {
        success: true,
        frame: frameData // This will be a Buffer with JPEG data
      };
    } catch (err) {
      console.error('Failed to get live view frame:', err);
      return { success: false, error: err.message };
    }
  }

  // Stop live view
  stopLiveView() {
    try {
      canonSDK.StopLiveView(this.selectedCamera);
      this.liveViewActive = false;
      console.log('✓ Live view stopped');
      return { success: true, message: 'Live view stopped' };
    } catch (err) {
      console.error('Failed to stop live view:', err);
      return { success: false, error: err.message };
    }
  }

  // Get camera properties
  getProperties() {
    try {
      if (this.selectedCamera === null) {
        return { success: false, error: 'No camera selected' };
      }

      const props = canonSDK.GetCameraProperties(this.selectedCamera);
      return {
        success: true,
        properties: {
          iso: props?.iso || 'N/A',
          aperture: props?.aperture || 'N/A',
          shutterSpeed: props?.shutterSpeed || 'N/A',
          whiteBalance: props?.whiteBalance || 'N/A',
          exposureCompensation: props?.exposureCompensation || '0.0',
          batteryLevel: props?.batteryLevel || 'N/A'
        }
      };
    } catch (err) {
      console.error('Failed to get properties:', err);
      return { success: false, error: err.message };
    }
  }

  // Set camera property
  setProperty(property, value) {
    try {
      if (this.selectedCamera === null) {
        return { success: false, error: 'No camera selected' };
      }

      canonSDK.SetCameraProperty(this.selectedCamera, property, value);
      console.log(`✓ Set ${property} to ${value}`);
      return { success: true, message: `${property} set to ${value}` };
    } catch (err) {
      console.error(`Failed to set ${property}:`, err);
      return { success: false, error: err.message };
    }
  }

  // Disconnect camera
  disconnectCamera() {
    try {
      if (this.selectedCamera !== null) {
        canonSDK.DisconnectCamera(this.selectedCamera);
        this.selectedCamera = null;
        console.log('✓ Camera disconnected');
      }
      return { success: true, message: 'Camera disconnected' };
    } catch (err) {
      console.error('Failed to disconnect camera:', err);
      return { success: false, error: err.message };
    }
  }

  // Terminate EDSDK
  terminate() {
    try {
      if (this.selectedCamera !== null) {
        this.disconnectCamera();
      }
      canonSDK.TerminateSDK();
      console.log('✓ EDSDK terminated');
      return { success: true, message: 'EDSDK terminated' };
    } catch (err) {
      console.error('Failed to terminate EDSDK:', err);
      return { success: false, error: err.message };
    }
  }
}

const cameraManager = new CameraManager();

// ==================== API ROUTES ====================

// Initialize EDSDK
app.post('/api/init', (req, res) => {
  const result = cameraManager.initialize();
  res.json(result);
});

// Get camera list
app.get('/api/cameras', (req, res) => {
  const result = cameraManager.getCameras();
  res.json(result);
});

// Connect to camera
app.post('/api/cameras/:id/connect', (req, res) => {
  const cameraId = parseInt(req.params.id);
  const result = cameraManager.connectCamera(cameraId);
  res.json(result);
});

// Get selected camera info
app.get('/api/camera/info', (req, res) => {
  if (cameraManager.selectedCamera === null) {
    return res.json({ success: false, error: 'No camera selected' });
  }
  res.json({
    success: true,
    selectedCamera: cameraManager.selectedCamera,
    liveViewActive: cameraManager.liveViewActive
  });
});

// Take photo
app.post('/api/camera/shoot', (req, res) => {
  const result = cameraManager.takePhoto();
  res.json(result);
});

// Start live view
app.post('/api/camera/liveview/start', (req, res) => {
  const result = cameraManager.startLiveView();
  res.json(result);
});

// Get live view frame
app.get('/api/camera/liveview/frame', (req, res) => {
  const result = cameraManager.getLiveViewFrame();
  
  if (result.success && result.frame) {
    res.type('image/jpeg');
    res.send(result.frame);
  } else {
    res.status(400).json(result);
  }
});

// Stop live view
app.post('/api/camera/liveview/stop', (req, res) => {
  const result = cameraManager.stopLiveView();
  res.json(result);
});

// Get camera properties
app.get('/api/camera/properties', (req, res) => {
  const result = cameraManager.getProperties();
  res.json(result);
});

// Set camera property
app.post('/api/camera/properties/:name', (req, res) => {
  const { name } = req.params;
  const { value } = req.body;
  
  if (!value) {
    return res.json({ success: false, error: 'Value is required' });
  }
  
  const result = cameraManager.setProperty(name, value);
  res.json(result);
});

// Disconnect camera
app.post('/api/cameras/disconnect', (req, res) => {
  const result = cameraManager.disconnectCamera();
  res.json(result);
});

// Terminate EDSDK
app.post('/api/terminate', (req, res) => {
  const result = cameraManager.terminate();
  res.json(result);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Canon EDSDK Server',
    port: PORT,
    selectedCamera: cameraManager.selectedCamera,
    liveViewActive: cameraManager.liveViewActive
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║  Canon EDSDK Server Started        ║');
  console.log('╚════════════════════════════════════╝\n');
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('\nAPI Endpoints:');
  console.log('  POST  /api/init                          - Initialize EDSDK');
  console.log('  GET   /api/cameras                       - Get camera list');
  console.log('  POST  /api/cameras/:id/connect           - Connect to camera');
  console.log('  GET   /api/camera/info                   - Get selected camera info');
  console.log('  POST  /api/camera/shoot                  - Take photo');
  console.log('  POST  /api/camera/liveview/start         - Start live view');
  console.log('  GET   /api/camera/liveview/frame         - Get live view frame');
  console.log('  POST  /api/camera/liveview/stop          - Stop live view');
  console.log('  GET   /api/camera/properties             - Get camera properties');
  console.log('  POST  /api/camera/properties/:name       - Set camera property');
  console.log('  POST  /api/cameras/disconnect            - Disconnect camera');
  console.log('  POST  /api/terminate                     - Terminate EDSDK\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  cameraManager.terminate();
  process.exit(0);
});