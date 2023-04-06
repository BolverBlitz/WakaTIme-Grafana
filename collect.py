#!/usr/bin/python3.8

import os
import sys
import time
from datetime import datetime, timedelta
import json
import http.client
import argparse


class Unbuffered(object):
    def __init__(self, stream):
        self.stream = stream

    def write(self, data):
        self.stream.write(data)
        self.stream.flush()

    def writelines(self, datas):
        self.stream.writelines(datas)
        self.stream.flush()

    def __getattr__(self, attr):
        return getattr(self.stream, attr)


sys.stdout = Unbuffered(sys.stdout)

parser = argparse.ArgumentParser()
parser.add_argument("-t", "--token", type=str,
                    help="Wakatime API token (As BASE64)")
parser.add_argument("-b", "--begin", type=str, default="2020-1-1",
                    help="Begin date (YYYY-MM-DD) (default: 2020-1-1)")
args = parser.parse_args()

if args.token is None:
    print("No token given.")
    exit(1)

conn = http.client.HTTPSConnection("wakatime.com")
print("Collecting wakatime stats from", args.begin)
begin = args.begin
statsToRecord = ["languages", "projects", "machines", "operating_systems"]


def main():
    with open(os.path.join(os.path.dirname(os.path.realpath(__file__)), "./logs/wakatime-stats.json"), "r") as f:
        allStats = json.loads(f.read())

    # log up to 2 days before to give time to wakatime to update all stats for a give day
    pointer = datetime.strptime(begin, "%Y-%m-%d")
    while pointer < datetime.now() - timedelta(days=2):
        # log already present
        if pointer.strftime("%Y-%m-%d") in allStats:
            pointer += timedelta(days=1)
            continue

        # get stats of the pointer date
        pointerStats = getDateStats(pointer.strftime("%Y-%m-%d"))
        if pointerStats == None:
            pointer += timedelta(days=1)
            continue

        allStats[pointer.strftime("%Y-%m-%d")] = {}  # dict must be initialized
        for category in pointerStats["data"][0].keys():
            if category not in statsToRecord:
                continue

            # dict must be initialized
            allStats[pointer.strftime("%Y-%m-%d")][category] = {}
            for type in pointerStats["data"][0][category]:
                allStats[pointer.strftime(
                    "%Y-%m-%d")][category][type["name"]] = type["total_seconds"]

        # sort dict items
        allStats = dict(sorted(allStats.items()))

        # update wakatime log right away to save current results
        with open(os.path.join(os.path.dirname(os.path.realpath(__file__)), "./logs/wakatime-stats.json"), "w") as f:
            f.write(json.dumps(allStats, indent=2))

        # terminal notification
        print(pointer.strftime("%Y-%m-%d"), "logged")

        # advance to next pointer date
        pointer += timedelta(days=1)


def getDateStats(date: str):
    dateStats = None
    try:
        conn.request(method="GET",
                     url="/api/v1/users/current/summaries?start="+date+"&end="+date,
                     body=None,
                     headers={'Authorization': "Basic " + args.token})
        res = conn.getresponse()
        dateStats = json.loads(res.read())
    except Exception as e:
        log(str(e))

    return dateStats


def log(*text: str):
    print(" | ".join(text))
    with open(os.path.join(os.path.dirname(os.path.realpath(__file__)), "./logs/wakatime-stats.log"), "a") as f:
        t = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        f.write(t + " | " + " | ".join(text) + "\n")


if __name__ == "__main__":
    main()
