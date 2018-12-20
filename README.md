# Nitrous

A fully-featured yet intuitive CLI bot for Nitro Type.

## Installation

```bash
# Use npm…
$ npm i -g @ifvictr/nitrous

# …or Yarn
$ yarn global add @ifvictr/nitrous

# …or npx (for one-off uses)
$ npx @ifvictr/nitrous [options]
```

## Usage

```bash
Usage: nitrous [options]

Options:
  -V, --version              output the version number
  -a, --accuracy <accuracy>  Average accuracy of racer. Should be a float value between 0 (0%) and 1 (100%).
  -c, --count <count>        The amount of races to complete before stopping. If omitted, the racer will never stop
  -f, --file <name>          File containing user credentials and other configurations
  -n, --maxNitros <count>    Maximum amount of nitros to use per race
  -p, --password <password>  Password of target user account
  -S, --smart                If enabled, WPM and accuracy automatically decrease over time to imitate fatigue
  -s, --targetPlace <place>  Target place (i.e. first place) of the racer (cannot be guaranteed)
  -t, --timeout <seconds>    Time to wait before starting the next race
  -u, --username <username>  Username (not display name) of target user account
  -w, --wpm <wpm>            Average WPM of racer
  -h, --help                 output usage information
```

## Setup

Refer to the [example config file](./config.example.json) for an idea of how to set your file up. All available configuration properties correspond to the command flags listed above.

### Advanced (not available via command flags)

#### `userAgent`

Set the user agent the bot uses (not required, but recommended if you want activity to blend in).

## License

[MIT](./LICENSE.txt)