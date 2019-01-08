#!/usr/bin/env python2.7

# author: Evgeny Labzin
# date: 2016/11/10

import boto.sns
import json
c = boto.sns.connect_to_region("us-east-1")

# topicarn = "arn:aws:sns:us-east-1:141047255820:mobile_news"
topicarn = "arn:aws:sns:us-east-1:141047255820:mobile_news_staging"
# topicarn = "arn:aws:sns:us-east-1:141047255820:o2_android_browser"
# t = {'data': { 'message': 'Test 4' }}

message = {
  "default": "Test", 
  "GCM": "{\"data\": { \"title\": \"This is a test.\", \"url\": \"http://www.cliqz.com\", \"type\": 20000}}"
}

message_subject = "Test"

# print json.dumps(message)
publication = c.publish(target_arn=topicarn, message=json.dumps(message), subject=message_subject, message_structure='json')

print publication
