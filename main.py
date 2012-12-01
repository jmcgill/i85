# The main entry point for the server which drives i-85.

###############################################################################
## System Libraries
###############################################################################

import os
import re
import time
import json
import random
import jinja2
import hashlib

from datetime import datetime

###############################################################################
## GAE Libraries
###############################################################################

import webapp2
from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp import template

###############################################################################
## User Libraries
###############################################################################

import models

###############################################################################
# Setup
###############################################################################

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

###############################################################################
# Views
###############################################################################

def ParseDate(date_string):
  if date_string:
    date = datetime.strptime(
        date_string,
        "%d-%m-%Y")
    epoch = datetime(1970, 1, 1)
    return (date - epoch).days
  else:
    return 0

class Index(webapp2.RequestHandler):
  def get(self):
    q = db.GqlQuery("SELECT * FROM Task")
    
    # HACK
    #for task in q:
    #  u = task.remaining_updates.split(",")
    #  u = [int(k) for k in u]
    #  r = task.remaining.split(",")
    #  for i in range(0, len(u)):
    #    if u[i] > 1354337000:
    #      del(u[i])
    #      del(r[i])
    #      task.remaining = ",".join([str(k) for k in r])
    #      task.remaining_updates = ",".join([str(k) for k in u])
    #      task.put()

    tasks = []
    for task in q:
      task.id = task.key().id()
      if task.start_day is None:
        task.start_day = 0
      tasks.append(task)

    q = db.GqlQuery("SELECT * FROM Vacation")
    vacations = []
    for vacation in q:
      vacation.id = vacation.key().id()
      if vacation.start_day is None:
        vacation.start_day = 0
      if vacation.end_day is None:
        vacation.end_day = 0
      vacations.append(vacation)

    editable = 'false'
    if self.request.get('edit'):
      editable = 'true'

    data = {
      "tasks": tasks,
      "vacations": vacations,
      "editable": editable
    }

    template = jinja_environment.get_template('main.html')
    self.response.out.write(template.render(data))


class UpdateTask(webapp2.RequestHandler):
  def post(self):
    if (self.request.get('id')):
      task = models.Task.get_by_id(int(self.request.get('id')))
    else:
      task = models.Task()

    task.start_day = ParseDate(self.request.get('start_day'))
    task.owner = self.request.get('owner')
    task.description = self.request.get('description')
    task.long_description = self.request.get('long_description')
    task.length = self.request.get('length')
    task.dependent_tasks = self.request.get('dependent_tasks')

    # Keep a history of 'days remaining' estimates.
    now = str(int(time.time()))
    if task.remaining:
      remaining = task.remaining.split(',')
      if remaining[-1] != self.request.get('remaining'):
        task.remaining += "," + self.request.get('remaining')
        task.remaining_updates += "," + now
    else:
      task.remaining = self.request.get('remaining')
      task.remaining_updates = now

    # Special case - A task with a length, and a date, but no days remaining
    # is assumed to have ocurred in the past.
    #if self.request.get('start_day') and not self.request.get('remaining'):
    #  update_time = task.start_day * 86400
    #  task.remaining = self.request.get('length')
    #  task.remaining_updates = str(update_time)

    task.put()

    output = {}
    output["id"] = str(task.key().id())
    output["owner"] = task.owner
    output["long_description"] = task.long_description
    output["description"] = task.description
    output["start_day"] = task.start_day
    output["remaining"] = task.remaining.split(",")
    output["remaining_updates"] = task.remaining_updates.split(",")
    output["length"] = task.length
    output["dependent_tasks"] = task.dependent_tasks.split(",")

    self.response.out.write(json.dumps(output))

class DeleteTask(webapp2.RequestHandler):
  def post(self):
    if not (self.request.get('id')):
      return

    task = models.Task.get_by_id(int(self.request.get('id')))
    db.delete(task)

class UpdateVacation(webapp2.RequestHandler):
  def post(self):
    if (self.request.get('id')):
      vacation = models.Vacation.get_by_id(int(self.request.get('id')))
    else:
      vacation = models.Vacation()

    vacation.start_day = ParseDate(self.request.get('start_day'))
    vacation.end_day = ParseDate(self.request.get('end_day'))
    vacation.owner = self.request.get('owner')
    vacation.put()

    output = {}
    output["id"] = str(vacation.key().id())
    output["owner"] = vacation.owner
    output["start_day"] = vacation.start_day
    output["end_day"] = vacation.end_day

    self.response.out.write(json.dumps(output))

class DeleteVacation(webapp2.RequestHandler):
  def post(self):
    if not (self.request.get('id')):
      return

    vacation = models.Vacation.get_by_id(int(self.request.get('id')))
    db.delete(vacation)

class ViewBurndown(webapp2.RequestHandler):
  def get(self, id):
    task = models.Task.get_by_id(int(id))
    remaining = task.remaining.split(",")
    timestamps = task.remaining_updates.split(",")

    burndown = []
    for i in range(0, len(remaining)):
      entry = {
        "timestamp": timestamps[i],
        "days_remaining": remaining[i]
      }
      burndown.append(entry)
    
    data = {
      "task": task,
      "burndown": burndown
    }
    template = jinja_environment.get_template('burndown.html')
    self.response.out.write(template.render(data))

app = webapp2.WSGIApplication([
    ('/', Index),
    ('/burndown/(\d+)', ViewBurndown),
    ('/tasks/update', UpdateTask),
    ('/tasks/delete', DeleteTask),
    ('/vacations/update', UpdateVacation),
    ('/vacations/delete', DeleteVacation),
  ],
  debug = True)
