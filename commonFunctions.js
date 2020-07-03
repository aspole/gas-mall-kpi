const delete_specific_triggers = (name_function) => {
  var all_triggers = ScriptApp.getProjectTriggers();

  for (var i = 0; i < all_triggers.length; ++i) {
    if (all_triggers[i].getHandlerFunction() == name_function)
      ScriptApp.deleteTrigger(all_triggers[i]);
  }
}
