# Database models for i-85.

from google.appengine.ext import db

###############################################################################
## MODELS
###############################################################################

# The state for a task.
class Task(db.Model):
  # The owner of this task.
  owner = db.StringProperty()
  
  # A short description of the task.
  description = db.StringProperty()

  # A longer description of the task.
  long_description = db.StringProperty()
  
  # The day on which the task is being started, if known.
  # Stored as an integer relative to Jan 1, 1970.
  start_day = db.IntegerProperty()
 
  # The number of days estimated for the task.
  # TODO(jmcgill): Change into a number.
  length = db.StringProperty()

  # Comma separated history of days remaining.
  remaining = db.StringProperty()

  # Comma separated history of times at which days remaining was updated,
  # in seconds since epoch.
  remaining_updates = db.StringProperty()

  # A list of the IDs of dependent tasks.
  dependent_tasks = db.StringProperty()

# The state for a vacation.
class Vacation(db.Model):
  # The owner or entity affected.
  owner = db.StringProperty()
  
  # The day on which the vacation is being started, inclusive.
  # Stored as an integer relative to Jan 1, 1970.
  start_day = db.IntegerProperty()

  # The day on which the vacation is being ended, inclusive.
  # Stored as an integer relative to Jan 1, 1970.
  end_day = db.IntegerProperty()
