function phoenix() {
  var properties = PropertiesService.getScriptProperties();
  // 例はint
  var prop = properties.getProperty("<name_of_property>")

  // 関数実行時点の時刻取得
  var start_time = new Date();

  while (true) {
    var current_time = new Date();
    var difference = parseInt((current_time.getTime() - start_time.getTime()) / (1000 * 60));

    if (difference >= 4) {
      /* 値の書き込みとか必要ならやる */

      // スクリプトプロパティの更新
      properties.setProperty("<name_of_property>", i);

      // ここはもうちょっと利口なやり方がありそう。
      ScriptApp
        .newTrigger("phoenix")
        .timeBased()
        .everyMinutes(5)
        .create();

      break;
    }
  }//ループ処理

  // スクリプトプロパティの初期化
  properties.setProperty("<name_of_property>", "test");

  //特定関数のトリガーのみ削除
  delete_specific_triggers("phoenix");

  return ;

}

const delete_specific_triggers = (name_function) => {
  var all_triggers = ScriptApp.getProjectTriggers();

  for (var i = 0; i < all_triggers.length; ++i) {
    if (all_triggers[i].getHandlerFunction() == name_function)
      ScriptApp.deleteTrigger(all_triggers[i]);
  }
}
