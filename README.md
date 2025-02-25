# Paint




## Currently

Halfassed brush selection / draw over an uimage you drag into the browser.  Not bad

## Goal dump

### Renderer

- Redraw from event list
- Events can contain user input or state changes
- User input generally should represent x/y/meta points
- Event list can b e re-run start to finish / redraw
- Should ideally be able to undo an event list partially

### Tools

- Brushes in toolbar maintain state ?  Eg: we are evolving a pallette of tools
- Colors, same ?
- Optional - > UI changes shouldn't be breaking to eventlist processing ... but might be cool to maintian UI state for clarity if replaying / rewinding to some point

### Export

- Save as bitmap
- Copy and paste image data ?
- Paste from buffer





