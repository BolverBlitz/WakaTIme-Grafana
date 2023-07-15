# WakaTIme-Grafana
 A free alternative to the wakatime dashboard, it will fetch your history automaticly (Max 2 weeks)

---
Is this project still maintained?  
If so, to what degree?  
I've made a list you can find [HERE](https://github.com/BolverBlitz/BolverBlitz/blob/main/MAINTENANCE.md) witch i'll keep updated, you can find the current status there.
---

# Wakatime update Julay 2023
 Sadly wakeapi.com dosn´t provide the full history like it used to anymore, you now have to buy premium to get your full 2 years of history, you can then unsibscribe and it will still work.
 Once fully fetched you can run it once every couple of days (within the 2 weeks) like you used to.

## Requirements
NodeJS 16+  
Python 3+  
InfluxDB 2.X  
Grafana 9.X  

## Setup
1. Clone the repo localy
2. Create a bucket called WakaTime in influx and a token with write permissions to it
3. Rename .env.example to .env and fill it out
4. Run `npm i`
5. Run `node index.js`
6. Import grafana_wakatime.json into your grafana (Check your datasource)
7. (Optional) Add a cronjob or something that will run it once every day

## Screenshot
![grafik](https://user-images.githubusercontent.com/35345288/230257145-8fb9d027-6b48-4443-8795-5c9cbbca3aee.png)

## Credits
Initial python version by [@gekigek99](https://github.com/gekigek99)