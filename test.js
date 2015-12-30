var test = require("nrtv-test")(require)
var library = test.library


library.define(
  "set-up",
  ["nano"],
  function(nano) {
    var nano = nano("http://localhost:5984")

    return function(db, callback) {
      nano.db.destroy(
        db,
        callback
      )
    }
  }
)


test.using(
  "can get back an object we set",

  ["./", "set-up"],
  function(expect, done, couch, setUp) {

    setUp("power-rangers__test",
      function() {
        var rangers = 
          new couch.KeyStore(
            "power-rangers__test",
            "color"
          )

        rangers.set(
          "yellow",
          {powerCoin: "Saber-Toothed Tiger"}
        )

        rangers.get(
          "yellow",
          checkRanger
        )
      }
    )

    function checkRanger(ranger) {
      expect(ranger).to.have.property("powerCoin", "Saber-Toothed Tiger")
      expect(ranger).to.have.property("color", "yellow")
      expect(ranger._id).to.match(/[a-z0-9]{32}/)
      done()
    }
  }
)

test.using(
  "can create the same KeyStore multiple times",

  ["./", "set-up", "async"],
  function(expect, done, couch, setUp, async) {

    setUp("normal-persons__test",
      function() {
        async.series([
          createOne,
          createOne,
          done
        ])
      }
    )

    function createOne(callback) {
      new couch.KeyStore(
        "normal-persons__test",
        "name",
        callback
      )
    }
  }
)


test.using(
  "works if you don't find anything",

  ["./", "set-up", "async"],
  function(expect, done, couch, setUp, async) {

    setUp("star__test",
      function() {
        planets = new couch.KeyStore(
          "star__test",
          "SAO"
        )
        planets.get("67174",
          function(vega) {
            expect(vega).to.be.undefined
            done()
          }
        )
      }
    )
  }
)

