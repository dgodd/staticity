require "kemal"
require "db"
require "pg"
require "json"

sites = {} of Int32 => String
DATABASE_URL = "postgres:///staticity"
PG_DB = DB.open(DATABASE_URL)
PG_DB.query "SELECT id,name FROM sites ORDER BY id" do |rs|
  rs.each do
    sites[rs.read(Int32)] = rs.read(String)
  end
end

class Site
  JSON.mapping(
    id: Int32,
    name: String,
  )
end
class Status
  JSON.mapping(
    site_id: Int32,
    status: Int32,
    seconds: Float64,
  )
end

websockets = {} of String => HTTP::WebSocket

# Creates a WebSocket handler.
# Matches "ws://host:port/socket"
ws "/socket" do |socket|
  # socket.send "Hello from Kemal!"
  uuid = SecureRandom.uuid
  websockets[uuid] = socket

  sites.each do |id,name|
    socket.send ["site",{"id"=>id,"name"=>name}].to_json
  end

  sql = "select site_id,status,seconds from (select site_id,status,seconds,created_at,rank() over (partition by site_id order by created_at desc) as r from statuses) as s where r<=30 order by created_at"
  PG_DB.query sql do |rs|
    rs.each do
      status = {"site_id"=>rs.read(Int32), "status"=>rs.read(Int32), "seconds"=>rs.read(Float64)}
      socket.send ["status", status].to_json
    end
  end

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

PG.connect_listen(DATABASE_URL, "site", "status") do |n|
  puts "    got: #{n.payload} on #{n.channel}"
  case n.channel
  when "site"
    site = Site.from_json(n.payload)
    sites[site.id] = site.name
    payload = ["site", site].to_json
    websockets.each do |_,socket|
      socket.send payload
    end
  when "status"
    payload = ["status", Status.from_json(n.payload)].to_json
    websockets.each do |_,socket|
      socket.send payload
    end
  else
    ## no-op
  end
end

spawn do
  while(true)
    sites.each do |id,site|
      begin
        puts "Site: #{site}"
        start = Time.utc_ticks
        response = HTTP::Client.get site
        elapsed = (Time.utc_ticks - start).to_f64 / Time::Span::TicksPerSecond
        PG_DB.exec("INSERT INTO statuses(site_id, status, seconds) VALUES($1, $2, $3)", id, response.status_code, elapsed)
      rescue e
        puts "EXCEPTION IN INSERT: #{e}"
      end
      sleep 1
    end
  end
end

serve_static({"gzip" => true, "dir_listing" => false})
Kemal.run
