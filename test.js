requirejs = require("requirejs")

requirejs(
  ["nrtv-component", "database-tie", "chai", "nano"],
  function(component, DatabaseTie, chai, nano) {
    var expect = chai.expect

    var Test = component(DatabaseTie)
    var db = Test.database("floober")

    Test.prototype.go =
      function() {
        db.set("foo", {bar: "baz"}, checkThatItsThere)
      }


    function checkThatItsThere(err, callback) {
      db.get("foo", function(err, value) {
        expect(value.bar).to.equal("baz")
        console.log("BAR IS BAZ!")
        clearTimeout(timeout)
      })
    }

    var timeout = setTimeout(function() {
      throw new Error("Database never sent a value back")
    }, 1000)



    // This should really start itself up on a specific port. :-/

    var nano = nano(
      "http://localhost:5984"
    )

    nano.db.destroy(
      "floober",
      function(err, body) {
        var instance = new Test()
        instance.start(function() {
          instance.go()
        })
      }
    )
  }
)