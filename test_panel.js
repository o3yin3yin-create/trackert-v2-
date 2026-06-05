'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDomServer = require('react-dom/server');

var _componentsFriendsPanel = require('./components/FriendsPanel');

var _componentsFriendsPanel2 = _interopRequireDefault(_componentsFriendsPanel);

console.log("Compiling...");
try {
  var html = (0, _reactDomServer.renderToString)(_react2['default'].createElement(_componentsFriendsPanel2['default'], { onClose: function () {} }));
  console.log("Success! Rendered HTML length:", html.length);
} catch (e) {
  console.error("Runtime Error:", e);
}
