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
          }, function(wasCreated) {
            expect(wasCreated).to.be.true
          })

        rangers.set(
          "yellow",
          {powerCoin: "Saber-Toothed Tiger"},
          checkThatItsThere
        )
      }
    )

    function checkThatItsThere() {
      rangers.get("yellow",
        function(ranger) {
          expect(ranger.powerCoin).to.equal("Saber-Toothed Tiger")
          expect(ranger.color).to.equal("yellow")
          done.ish("got value back")

          testReCreating()
        }
      )
    }

    function testReCreating() {
      new couch.KeyStore({
        database: "power-rangers__test",
        key: "color"
      }, function(wasCreated) {
        expect(wasCreated).to.be.false
        done()
      })
    }
  }
)