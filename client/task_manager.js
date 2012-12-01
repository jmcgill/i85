function TaskManager(tasks, vacations) {
  this.tasks_ = tasks;
  this.vacations_ = vacations;
}

// All dates are relative to Jan 1, 1970

TaskManager.prototype.ExpandTasks = function() {
  // Reset all tasks.
  for (var i = 0; i < this.tasks_.length; ++i) {
    this.tasks_[i].end_day = null;
    this.tasks_[i].derived_start_day = null;
  }

  for (var i = 0; i < this.tasks_.length; ++i) {
  	var task = this.tasks_[i];

  	// Ignore empty sets of dependent tasks.
  	if (task.dependent_tasks[0] == "") {
  	  task.dependent_tasks = [];
  	}
  }

  for (var i = 0; i < this.tasks_.length; ++i) {
    var task = this.tasks_[i];
    this.ExpandTask(task);
  }
}

// Returns the end date for a particular task, expanding it if
// required.
TaskManager.prototype.ExpandTask = function(task) {
  	// Has this task already been expanded?
  	if (task.derived_start_day && task.end_day) {
      return task.end_day;
  	}

  	// When can we start this task?
  	var start = Math.max(0, task.start_day);
  	for (var i = 0; i < task.dependent_tasks.length; ++i) {
      var dep_id = this.GetDepId(task.dependent_tasks[i]);

      var dep_task = this.GetTaskById(dep_id);
      if (!dep_task) {
        console.log('Could not find task with ID: ', dep_id);
      }
      var dep_end_day = this.ExpandTask(dep_task);

      // Apply a filter if required.
      dep_end_day = this.ApplyFilter(task.dependent_tasks[i], dep_end_day);
      task.derived_dep_end = dep_end_day;
      task.derived_dep_owner = dep_task.owner;

      var start = Math.max(start, dep_end_day);
  	}
    task.derived_start_day = start;

    // When will we end this task?
    var today = Math.floor(new Date().getTime() / 86400000);
    var remaining_days = task.remaining[task.remaining.length - 1];

    // If actually 'on' the task, use remaining days since the last remaining
    // days update.
    if (today >= start) {
      last_update = Math.floor(
          task.remaining_updates[task.remaining_updates.length - 1] / 86400);
      task.end_day = last_update;
    } else {
      task.end_day = task.derived_start_day;
    }

    while (remaining_days > 0) {
      task.end_day += 1;
      var day_of_week = this.DayOffsetToDayOfWeek(task.end_day);

      // Is this a weekend?
      if (day_of_week == 0 || day_of_week == 6) {
        continue;
      }

      // Is this user on vacation?
      if (this.IntersectsVacation(task.owner, task.end_day)) {
        continue;
      }

      remaining_days -= 1;
    }
    return task.end_day;
}

TaskManager.prototype.DayOffsetToDayOfWeek = function(day_offset) {
  var ms_per_day = 86400000;
  var day = new Date(ms_per_day * day_offset);
  return day.getDay();
}

TaskManager.prototype.GetTaskById = function(id) {
  for (var i = 0; i < this.tasks_.length; ++i) {
    if (this.tasks_[i].id == id) return this.tasks_[i];
  }
  return null;
}

TaskManager.prototype.IntersectsVacation = function(owner, day) {
  for (var i = 0; i < this.vacations_.length; ++i) {
    vacation = this.vacations_[i];

    // Does this vacation belong to this owner?
    if (vacation.owner != owner) {
      continue;
    }

    // Is this day inside this vacation?
    if (day >= vacation.start_day && day <= vacation.end_day) {
      return true;
    }
  }
  return false;
}

// End dates as a function of a CW release.
// From the provided day, find the next Friday (cutoff), and then
// Monday two weeks after that.
TaskManager.prototype.cw_release = function(day) {
  var day_of_week = this.DayOffsetToDayOfWeek(day);

  // Day of the cut.
  var next_friday = (12 - day_of_week) % 7;

  // Find the next available cut.
  while (this.IntersectsVacation("cw_release", day + next_friday)) {
    next_friday += 7;
  }

  var next_monday = next_friday + 3;
  var monday_fortnight = (day + next_monday + 7);

  return monday_fortnight;
}

TaskManager.prototype.GetDepId = function(dep_id_string) {
  return dep_id_string.split("|")[0];
}

TaskManager.prototype.ApplyFilter = function(dep_id_string, day) {
  var filter = dep_id_string.split("|")[1];

  if (filter == "cw_release") {
    // TODO(jmcgill): Factor out.
    var task = null;
    for (var i = 0; i < derived_tasks_.length; ++i) {
      if (derived_tasks_[i].id == dep_id_string) {
        task = derived_tasks_[i];
      }
    }

    // Have we already constructed a derived task with this ID?
    if (!task) {
      task = {
        id: dep_id_string,
        description: "Cartewheel Release"
      }
      derived_tasks_.push(task);
    }
    task.derived_dep_end = day;
    task.end_day = this.cw_release(day);

    return this.cw_release(day);
  } else {
    return day;
  }
}


// TEMP
function DayOffsetToShortDate(day_offset) {
  var ms_per_day = 86400000;
  var day = new Date(ms_per_day * day_offset);
  return day.getDate() + '-' + (day.getMonth() + 1);
}
