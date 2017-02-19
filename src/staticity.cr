require "kemal"
require "json"

class Config
  JSON.mapping(
    sites: Array(String),
  )
end
config = Config.from_json(File.read("config.json"))

websockets = {} of String => HTTP::WebSocket

# Creates a WebSocket handler.
# Matches "ws://host:port/socket"
ws "/socket" do |socket|
  # socket.send "Hello from Kemal!"
  uuid = SecureRandom.uuid
  websockets[uuid] = socket

  socket.on_close do
    puts "Closing socket"
    websockets.delete(uuid)
  end
end

def broadcast(websockets, hash)
  websockets.each do |_,socket|
    socket.send hash.to_json
  end
end


spawn do
  while(true)
    config.sites.each do |site|
      puts "Site: #{site}"
      start = Time.utc_ticks
      response = HTTP::Client.get site
      elapsed = (Time.utc_ticks - start).to_f64 / Time::Span::TicksPerSecond
      broadcast(websockets, { "site" => site, "status" => response.status_code, "seconds" => elapsed })
    end

    # broadcast(websockets, { "site" => "http://example.com", "status" => 200, "seconds" => rand })
    # sleep 2
    # broadcast(websockets, { "site" => "http://example.org", "status" => 201, "seconds" => rand })
    # sleep 2
  end
end

serve_static({"gzip" => true, "dir_listing" => false})
Kemal.run
