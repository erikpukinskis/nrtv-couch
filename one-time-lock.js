function OneTimeLock(func) {
  this.isLocked = true
  this.waiting = []
  func(this._unlock.bind(this))
}

OneTimeLock.prototype._unlock =
  function() {
    this.isLocked = false
    for(var i=this.waiting.length-1; i>=0; i--) {
      this.waiting[i]()
    }
    delete this.waiting
  }

OneTimeLock.prototype.whenOpen =
  function(func) {
    if (this.isLocked) {
      this.waiting.push(func)
    } else {
      func()
    }
  }

module.exports = OneTimeLock
