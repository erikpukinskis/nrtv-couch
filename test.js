var test = require("nrtv-test")(require)

test.using(
  "can get back an object we set",

  ["./", "nano"],
  function(expect, done, couch, nano) {

    var rangers

    var nano = nano("http://localhost:5984")

    nano.db.destroy(
      "power-rangers__test",
      function(err, body) {

        rangers =
          new couch.KeyStore({
            database: "power-rangers__test",
            key: "color"
          }, function() {
            rangers.set(
              "yellow",
              {powerCoin: "Saber-Toothed Tiger"},
              checkThatItsThere
            )
          })

      }
    )

    function checkThatItsThere() {
      rangers.get("yellow",
        function(ranger) {
          expect(ranger).to.have.property("powerCoin", "Saber-Toothed Tiger")
          expect(ranger).to.have.property("color", "yellow")
          expect(ranger._id).to.match(/[a-z0-9]{32}/)
          done.ish("got value back")

          testReCreating()
        }
      )
    }

    function testReCreating() {
      new couch.KeyStore({
        database: "power-rangers__test",
        key: "color"
      }, done)
    }
  }
)