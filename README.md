# homebridge-rfbridge

> A [homebridge](https://github.com/nfarina/homebridge) plugin for controlling radio controller ceiling fans (but theoretically any RF controlled device) via [rfbridge](https://github.com/edc1591/rfbridge).

[![npm version](https://badge.fury.io/js/homebridge-rfbridge.svg)](https://badge.fury.io/js/homebridge-rfbridge)
[![License][license-image]][license-url]

## Installation

This guide assumes that you already have a running [`rfbridge`](https://github.com/edc1591/rfbridge) server.

```
# Install homebridge
$ npm install -g homebridge

# Install plugin
$ npm install -g homebridge-rfbridge
```

or add `homebridge-rfbridge` to your `install.sh` file.

## Configuration

No configuration is necessary. `homebridge-rfbridge` will automatically discover any [`rfbridge`](https://github.com/edc1591/rfbridge) servers on your network.

## Meta

You can find me on Twitter [@edc1591](https://twitter.com/edc1591)

Distributed under the MIT license. See ``LICENSE`` for more information.

[license-image]: https://img.shields.io/badge/License-MIT-blue.svg
[license-url]: LICENSE